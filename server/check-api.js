import axios from "axios";

async function run() {
  try {
    const res = await axios.get("http://localhost:3000/api/inventory/items", {
      headers: {
        Authorization: "Bearer " + "dummy" // wait, I don't have a token.
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.message);
  }
}
run();
