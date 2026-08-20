import { pool } from "./server/db/pool.js";

async function run() {
  const connection = await pool.getConnection();
  try {
    const userId = 7;
    const branchId = 2;
    const limit = 20;
    const offset = 0;
    
    const [posts] = await connection.query(
        `
        SELECT DISTINCT 
          p.id,
          p.user_id,
          p.content,
          p.image_url,
          p.visibility_type,
          COALESCE(p.branch_id, p.warehouse_id) AS branch_id,
          p.like_count,
          p.comment_count,
          p.created_at,
          u.full_name,
          u.profile_picture AS profile_picture,
          (SELECT COUNT(*)
         FROM post_likes pl
         WHERE pl.post_id = p.id AND pl.user_id = ?) AS user_liked
        FROM posts p
        JOIN adm_users u ON p.user_id = u.id
        WHERE 
          (p.user_id = ?)
          OR
          (p.visibility_type = 'company')
          OR
          (p.visibility_type IN ('branch', 'warehouse') AND COALESCE(p.branch_id, p.warehouse_id) = ?)
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
        `,
        [userId, userId, branchId, limit, offset]
      );
      
      const origin = `http://localhost`;
      const toAbsoluteImageUrl = (s) => {
        try {
          if (!s) return null;
          const str = String(s);
          if (/^https?:\/\//i.test(str)) {
            try {
              const u = new URL(str);
              if (
                u.hostname === "localhost" &&
                (u.port === "5173" || u.port === "5174" || u.port === "")
              ) {
                return `${origin}${u.pathname}`;
              }
              return str;
            } catch {
              return str;
            }
          }
          if (str.startsWith("/uploads")) return `${origin}${str}`;
          if (str.startsWith("uploads")) return `${origin}/${str}`;
          return str;
        } catch {
          return s;
        }
      };
      
      const postsWithComments = await Promise.all(
        posts.map(async (post) => {
          const [comments] = await connection.query(
            `
            SELECT 
              pc.id,
              pc.user_id,
              pc.comment_text,
              pc.created_at,
              u.full_name,
              u.profile_picture AS profile_picture
            FROM post_comments pc
            JOIN adm_users u ON pc.user_id = u.id
            WHERE pc.post_id = ?
            ORDER BY pc.created_at DESC
            LIMIT 3
            `,
            [post.id]
          );

          const toUrl = (blob) => {
            if (!blob) return null;
            const b = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
            const str = b.toString("utf8");
            if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:")) return str;
            let mime = "image/jpeg";
            if (
              b.length >= 3 &&
              b[0] === 0xff &&
              b[1] === 0xd8 &&
              b[2] === 0xff
            ) {
              mime = "image/jpeg";
            } else if (
              b.length >= 8 &&
              b[0] === 0x89 &&
              b[1] === 0x50 &&
              b[2] === 0x4e &&
              b[3] === 0x47 &&
              b[4] === 0x0d &&
              b[5] === 0x0a &&
              b[6] === 0x1a &&
              b[7] === 0x0a
            ) {
              mime = "image/png";
            } else if (
              b.length >= 12 &&
              b[0] === 0x52 &&
              b[1] === 0x49 &&
              b[2] === 0x46 &&
              b[3] === 0x46 &&
              b[8] === 0x57 &&
              b[9] === 0x45 &&
              b[10] === 0x42 &&
              b[11] === 0x50
            ) {
              mime = "image/webp";
            }
            return `data:${mime};base64,${b.toString("base64")}`;
          };
          
          const mappedComments = comments.reverse().map((c) => ({
            ...c,
            profile_picture_url: toUrl(c.profile_picture),
          }));
          return {
            ...post,
            image_url: toAbsoluteImageUrl(post.image_url),
            profile_picture_url: toUrl(post.profile_picture),
            comments: mappedComments,
            user_liked: post.user_liked === 1,
          };
        })
      );
      
      console.log("Success! Posts count:", postsWithComments.length);
  } catch (err) {
      console.error("FAILED WITH ERROR:", err);
  } finally {
      connection.release();
      process.exit(0);
  }
}

run();
