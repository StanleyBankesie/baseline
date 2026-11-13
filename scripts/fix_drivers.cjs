const fs = require('fs');

const p = 'client/src/pages/modules/transport/drivers/DriversList.jsx';
let code = fs.readFileSync(p, 'utf8');

// Replace the bad placement where cards were inside {!isTab ? (
const badBlockMatch = code.match(/\{\/\* Metric Stats Cards \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
if (badBlockMatch) {
  code = code.replace(badBlockMatch[0], '');
}

code = code.replace(/\{!isTab\s*\?\s*\(\s*<div className="card">/g, '{!isTab ? (\n        <div className="card">');

const cards = `      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Drivers",
            val: (drivers || []).filter((x) => x.status === "ACTIVE" || x.status === "AVAILABLE" || x.status === "ON_TRIP").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Drivers",
            val: (drivers || []).length,
            icon: <Users size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Verification",
            val: (drivers || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "ON_LEAVE").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Licensed / Valid",
            val: (drivers || []).filter((x) => x.status === "ACTIVE" || x.status === "AVAILABLE" || x.status === "VERIFIED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stat.val}
              </p>
            </div>
            <div className={\`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md \${stat.color}\`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>\n\n`;

const target = '{!isTab ? (';
if (!code.includes('Active Drivers')) {
  code = code.replace(target, cards + '      ' + target);
}

fs.writeFileSync(p, code, 'utf8');
console.log('Fixed DriversList.jsx successfully');
