const fs = require('fs');
let content = fs.readFileSync('client/src/layout/AppShell.jsx', 'utf8');

const target = `      {/* Apple-style Mobile Bottom Navigation Tab Bar (HIG compliant, >=44pt targets, tactile press) */}
      <nav
        aria-label="Mobile Navigation"
        data-rbac-exempt="true"
        className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 z-40 flex items-center justify-around px-2 shadow-apple-dock pb-[env(safe-area-inset-bottom)]"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            \`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all duration-150 active:scale-95 \${
              isActive
                ? "text-brand-900 dark:text-brand-300 font-semibold"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }\`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Home</span>
        </NavLink>

        {topMobileModules.map((m) => (
          <NavLink
            key={m.key}
            to={m.path}
            className={({ isActive }) =>
              \`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all duration-150 active:scale-95 \${
                isActive
                  ? "text-brand-900 dark:text-brand-300 font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }\`
            }
          >
            <span
              className="w-5 h-5 mb-0.5 flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5"
              aria-hidden="true"
            >
              {m.icon}
            </span>
            <span className="text-[11px] leading-tight truncate max-w-[64px] text-center">
              {m.shortLabel || m.label}
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          aria-label="Toggle all modules menu"
          data-rbac-exempt="true"
          onClick={() => setSidebarOpen((v) => !v)}
          className={\`flex flex-col items-center justify-center min-w-[56px] py-1 transition-all duration-150 active:scale-95 \${
            sidebarOpen
              ? "text-brand-900 dark:text-brand-300 font-semibold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }\`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Menu</span>
        </button>
      </nav>`;

const replacement = `      {/* Apple-style Mobile Bottom Navigation Tab Bar for Small & Medium screens (< lg / 1024px) */}
      <nav
        aria-label="Mobile Navigation"
        data-rbac-exempt="true"
        className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 z-40 flex items-center px-2 shadow-apple-dock pb-[env(safe-area-inset-bottom)]"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            \`flex flex-col items-center justify-center shrink-0 min-w-[54px] px-2 py-1 transition-all duration-150 active:scale-95 border-r border-slate-200/60 dark:border-slate-800/80 \${
              isActive
                ? "text-brand-900 dark:text-brand-300 font-semibold"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }\`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Home</span>
        </NavLink>

        {/* Horizontally Slideable/Scrollable Module Icons for Small & Medium devices */}
        <div 
          className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none no-scrollbar px-1.5 py-1"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {topMobileModules.map((m) => (
            <NavLink
              key={m.key}
              to={m.path}
              className={({ isActive }) =>
                \`flex flex-col items-center justify-center shrink-0 min-w-[56px] px-2 py-1 rounded-xl transition-all duration-150 active:scale-95 \${
                  isActive
                    ? "text-brand-900 dark:text-brand-300 font-semibold bg-brand-50/60 dark:bg-brand-950/50"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }\`
              }
            >
              <span
                className="w-5 h-5 mb-0.5 flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5"
                aria-hidden="true"
              >
                {m.icon}
              </span>
              <span className="text-[11px] leading-tight truncate max-w-[68px] text-center">
                {m.shortLabel || m.label}
              </span>
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          aria-label="Toggle all modules menu"
          data-rbac-exempt="true"
          onClick={() => setSidebarOpen((v) => !v)}
          className={\`flex flex-col items-center justify-center shrink-0 min-w-[54px] px-2 py-1 border-l border-slate-200/60 dark:border-slate-800/80 transition-all duration-150 active:scale-95 \${
            sidebarOpen
              ? "text-brand-900 dark:text-brand-300 font-semibold"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }\`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] leading-tight">Menu</span>
        </button>
      </nav>`;

// Normalize CRLF
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const updated = normalizedContent.replace(normalizedTarget, replacement);
  fs.writeFileSync('client/src/layout/AppShell.jsx', updated, 'utf8');
  console.log('AppShell.jsx mobile navbar updated successfully');
} else {
  console.log('Target not found in AppShell.jsx');
}
