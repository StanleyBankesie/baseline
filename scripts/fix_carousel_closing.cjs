const fs = require('fs');

// 1. PaymentClaimsPage.jsx
{
  const f = 'client/src/pages/modules/project-management/claims/PaymentClaimsPage.jsx';
  let c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const target = `                <div className={\`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md shrink-0 \${card.badgeColor}\`}>
                  <Icon size={20} className="stroke-[2.5]" />
        </MobileMovingCarousel>
                </div>
              </div>
            );
          })}
        </div>`;
  const rep = `                <div className={\`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md shrink-0 \${card.badgeColor}\`}>
                  <Icon size={20} className="stroke-[2.5]" />
                </div>
              </div>
            );
          })}
        </MobileMovingCarousel>`;
  if (c.includes(target)) {
    c = c.replace(target, rep);
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed PaymentClaimsPage.jsx');
  } else {
    console.error('Target not found in PaymentClaimsPage.jsx');
  }
}

// 2. ProjectClosurePage.jsx
{
  const f = 'client/src/pages/modules/project-management/closure/ProjectClosurePage.jsx';
  let c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const target = `                  <div className={\`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md \${
                    Number(closeoutForm.budget_variance) >= 0 ? "bg-emerald-600" : "bg-rose-500"
                  }\`}>
                    <DollarSign size={20} className="stroke-[2.5]" />
        </MobileMovingCarousel>
                </div>
              </div>`;
  const rep = `                  <div className={\`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md \${
                    Number(closeoutForm.budget_variance) >= 0 ? "bg-emerald-600" : "bg-rose-500"
                  }\`}>
                    <DollarSign size={20} className="stroke-[2.5]" />
                  </div>
                </div>
              </MobileMovingCarousel>`;
  if (c.includes(target)) {
    c = c.replace(target, rep);
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed ProjectClosurePage.jsx');
  } else {
    console.error('Target not found in ProjectClosurePage.jsx');
  }
}

// 3. PaymentApplicationList.jsx
{
  const f = 'client/src/pages/modules/project-management/construction/PaymentApplicationList.jsx';
  let c = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const target = `          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-rose-600">
            <Clock size={20} className="stroke-[2.5]" />
        </MobileMovingCarousel>
        </div>
      </div>`;
  const rep = `          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-rose-600">
            <Clock size={20} className="stroke-[2.5]" />
          </div>
        </div>
      </MobileMovingCarousel>`;
  if (c.includes(target)) {
    c = c.replace(target, rep);
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed PaymentApplicationList.jsx');
  } else {
    console.error('Target not found in PaymentApplicationList.jsx');
  }
}
