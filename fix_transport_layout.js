import fs from 'fs';

const filePath = 'client/src/pages/modules/transport/TransportLayout.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
const importTarget = `import TransportReports from "./reports/TransportReports.jsx";`;
if (content.includes(importTarget) && !content.includes('TransportIncomeList')) {
  content = content.replace(
    importTarget,
    `import TransportReports from "./reports/TransportReports.jsx";
import TransportIncomeList from "./income/TransportIncomeList.jsx";
import TransportExpenseList from "./expenses/TransportExpenseList.jsx";`
  );
  console.log("Added imports");
}

// 2. Add dashboard cards
const cardsRegex = /\{\s*title:\s*"Billing",[\s\S]*?\},/;
const cardsAddition = `{ 
          title: "Billing", 
          path: "/transport/billing", 
          feature_key: "billing", 
          description: "Manage transport invoices and billing",
          icon: "🧾",
          actions: [
            <ActionButton key="view" label="View" path="/transport/billing" type="outline" featureKey="transport:billing" action="view" />
          ]
        },
        { 
          title: "Transportation Income", 
          path: "/transport/income", 
          feature_key: "income", 
          description: "Manage income records",
          icon: "💵",
          actions: [
            <ActionButton key="view" label="View" path="/transport/income" type="outline" featureKey="transport:income" action="view" />
          ]
        },
        { 
          title: "Transportation Expenses", 
          path: "/transport/expenses", 
          feature_key: "expenses", 
          description: "Manage expense records",
          icon: "💸",
          actions: [
            <ActionButton key="view" label="View" path="/transport/expenses" type="outline" featureKey="transport:expenses" action="view" />
          ]
        },`;

if (!content.includes('Transportation Income')) {
  if (cardsRegex.test(content)) {
    content = content.replace(cardsRegex, cardsAddition);
    console.log("Added cards");
  }
}

// 3. Add Routes
const routesTarget = `<Route path="reports" element={<TransportReports />} />`;
if (content.includes(routesTarget) && !content.includes('<Route path="income"')) {
  content = content.replace(
    routesTarget,
    `<Route path="reports" element={<TransportReports />} />
      <Route path="income" element={<TransportIncomeList />} />
      <Route path="expenses" element={<TransportExpenseList />} />`
  );
  console.log("Added routes");
}

fs.writeFileSync(filePath, content);
console.log("TransportLayout completely fixed.");
