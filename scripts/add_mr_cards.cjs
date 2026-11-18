const fs = require('fs');

const file = 'client/src/pages/modules/inventory/MaterialRequisitionList.jsx';
let c = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const targetHeaderClose = `            <div className="flex gap-2">
              <Link to="/inventory?section=Stock%20Operations" className="btn btn-secondary">
                Return to Menu
              </Link>
              <Link
                to="/inventory/material-requisitions/new"
                className="btn-success"
              >
                + New Requisition
              </Link>
            </div>
          </div>
        </div>
        <div className="card-body">`;

const replacement = `            <div className="flex gap-2">
              <Link to="/inventory?section=Stock%20Operations" className="btn btn-secondary">
                Return to Menu
              </Link>
              <Link
                to="/inventory/material-requisitions/new"
                className="btn-success"
              >
                + New Requisition
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Stats Cards Carousel */}
      <MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">
        {[
          {
            label: "Active Requisitions",
            val: (requisitions || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN" || x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Requisitions",
            val: (requisitions || []).length,
            icon: <Package size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Approvals",
            val: (requisitions || []).filter((x) => x.status === "PENDING" || x.status === "PENDING_APPROVAL" || x.status === "SUBMITTED").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Approved Requisitions",
            val: (requisitions || []).filter((x) => x.status === "APPROVED" || x.status === "ISSUED" || x.status === "CONFIRMED" || x.status === "COMPLETED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
        ].map((stat, i) => (
          <div key={i} className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-smoky-card hover:shadow-smoky-lg transition-all">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stat.val}
              </p>
            </div>
            <div className={\`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md \${stat.color || (i === 0 ? "bg-sky-600 text-white" : i === 1 ? "bg-brand-900 text-white" : i === 2 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white")}\`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </MobileMovingCarousel>

      <div className="card">
        <div className="card-body">`;

if (!c.includes(targetHeaderClose)) {
  console.error('Target not found in MaterialRequisitionList.jsx');
  process.exit(1);
}

c = c.replace(targetHeaderClose, replacement);
fs.writeFileSync(file, c, 'utf8');
console.log('Added standard metric cards to MaterialRequisitionList.jsx successfully!');
