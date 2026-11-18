const fs = require('fs');

// 1. AttendanceList.jsx
{
  const file = 'client/src/pages/modules/human-resources/attendance/AttendanceList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\(attendance \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed AttendanceList.jsx');
}

// 2. CandidatesList.jsx
{
  const file = 'client/src/pages/modules/human-resources/recruitment/CandidatesList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\(candidates \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed CandidatesList.jsx');
}

// 3. InterviewsList.jsx
{
  const file = 'client/src/pages/modules/human-resources/recruitment/InterviewsList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\(interviews \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed InterviewsList.jsx');
}

// 4. OffersList.jsx
{
  const file = 'client/src/pages/modules/human-resources/recruitment/OffersList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\(offers \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed OffersList.jsx');
}

// 5. RequisitionList.jsx
{
  const file = 'client/src/pages/modules/human-resources/recruitment/RequisitionList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\(requisitions \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed RequisitionList.jsx');
}

// 6. LeaveSetupList.jsx
{
  const file = 'client/src/pages/modules/human-resources/leave-setup/LeaveSetupList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\(leaveTypes \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed LeaveSetupList.jsx');
}

// 7. TrainingList.jsx
{
  const file = 'client/src/pages/modules/human-resources/training/TrainingList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\(trainings \|\| \[\]\)/g, '(programs || [])');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed TrainingList.jsx');
}

// 8. MedicalPolicyForm.jsx
{
  const file = 'client/src/pages/modules/human-resources/medical-policies/MedicalPolicyForm.jsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/disabled=\{readOnly \|\| \(/g, 'disabled={(');
  fs.writeFileSync(file, c, 'utf8');
  console.log('Fixed MedicalPolicyForm.jsx');
}
