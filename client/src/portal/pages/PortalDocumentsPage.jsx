import React, { useState, useEffect } from "react";
import portalApi from "../api/portalClient.js";
import { FileText, Download, ShieldCheck, Search, Eye } from "lucide-react";

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await portalApi.get("/documents");
      setDocuments(res.data?.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocs = documents.filter((d) =>
    (d.doc_name || d.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span>My Documents & Files</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Securely access your employment contracts, certifications, and HR letters.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            {search ? "No matching documents found." : "No uploaded documents found for your profile."}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{doc.doc_name || doc.name || "HR Document"}</h4>
                    <p className="text-[10px] text-slate-400">
                      Uploaded on: {doc.created_at?.split("T")[0] || "N/A"} · Type: {doc.doc_type || "PDF"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.doc_url && (
                    <a
                      href={doc.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}