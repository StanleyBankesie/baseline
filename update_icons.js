const fs = require('fs');

const f = 'client/src/pages/modules/service-management/ServiceManagementHome.jsx';
let content = fs.readFileSync(f, 'utf8');

// Replace standard emojis with Lucide component
content = content.replace(/icon: "📋"/g, 'icon: FileText');
content = content.replace(/icon: "🧾"/g, 'icon: FileText');
content = content.replace(/icon: "🏭"/g, 'icon: FileText');
content = content.replace(/icon: "📝"/g, 'icon: FileText');
content = content.replace(/icon: "🔧"/g, 'icon: FileText');
content = content.replace(/icon: "✅"/g, 'icon: FileText');
content = content.replace(/icon: "💸"/g, 'icon: FileText');
content = content.replace(/icon: "👥"/g, 'icon: FileText');
content = content.replace(/icon: "📊"/g, 'icon: FileText');
content = content.replace(/icon: "⏱️"/g, 'icon: FileText');
content = content.replace(/icon: "👨‍🔧"/g, 'icon: FileText');
content = content.replace(/icon: "💰"/g, 'icon: FileText');
content = content.replace(/icon: "🔄"/g, 'icon: FileText');
content = content.replace(/icon: "📈"/g, 'icon: FileText');
content = content.replace(/icon: "⚙️"/g, 'icon: FileText');

if (!content.includes('import { FileText')) {
  content = content.replace(/import React from "react";/, 'import React from "react";\nimport { FileText } from "lucide-react";');
}

fs.writeFileSync(f, content);
console.log('done');
