export const projects = [
  {name:'Website Redesign', code:'TMG-001', client:'Acme Corp', clientInitial:'A', progress:80, status:'On Track', statusTone:'green', budget:'$12,000', due:'Apr 25, 2025', team:['JD','AM','RK'], more:2},
  {name:'Mobile App Development', code:'TMG-002', client:'NovaTech', clientInitial:'N', progress:60, status:'In Progress', statusTone:'blue', budget:'$25,000', due:'May 18, 2025', team:['RK','AM','LS'], more:3},
  {name:'CRM Integration', code:'TMG-003', client:'Zenith Ltd', clientInitial:'Z', progress:35, status:'At Risk', statusTone:'orange', budget:'$18,000', due:'May 02, 2025', team:['PS','RK','AM'], more:2},
  {name:'Cloud Migration', code:'TMG-004', client:'Skyline', clientInitial:'S', progress:90, status:'On Track', statusTone:'green', budget:'$30,000', due:'Apr 30, 2025', team:['JD','PS','LS'], more:4},
  {name:'IT Support Portal', code:'TMG-005', client:'BrightPath', clientInitial:'B', progress:20, status:'Planning', statusTone:'slate', budget:'$10,000', due:'Jun 12, 2025', team:['AM','LS','RK'], more:1},
  {name:'Data Analytics Platform', code:'TMG-006', client:'Matrix Inc', clientInitial:'M', progress:50, status:'In Progress', statusTone:'blue', budget:'$22,000', due:'May 28, 2025', team:['JD','AM','PS'], more:3},
  {name:'HR Management System', code:'TMG-007', client:'PeopleFirst', clientInitial:'P', progress:70, status:'On Track', statusTone:'green', budget:'$16,000', due:'Apr 22, 2025', team:['LS','RK','PS'], more:2},
  {name:'Security Audit', code:'TMG-008', client:'SecureNet', clientInitial:'S', progress:100, status:'Completed', statusTone:'green', budget:'$8,000', due:'Mar 15, 2025', team:['JD','RK'], more:1},
];

export const tickets = [
  {id:'#SUP-0421', title:'Cannot access my account', requester:'Sarah Khan', company:'Acme Corp', category:'Access', priority:'High', status:'Open', date:'Apr 25, 2025', tone:'red'},
  {id:'#SUP-0420', title:'Feature request: dashboard', requester:'Michael Chen', company:'NovaTech', category:'Feature', priority:'Medium', status:'In Progress', date:'Apr 24, 2025', tone:'orange'},
  {id:'#SUP-0419', title:'Error while exporting report', requester:'Priya Sharma', company:'Zenith Ltd', category:'Bug', priority:'High', status:'Open', date:'Apr 24, 2025', tone:'red'},
  {id:'#SUP-0418', title:'Billing clarification', requester:'Daniel Kim', company:'Skyline', category:'Billing', priority:'Low', status:'Pending', date:'Apr 23, 2025', tone:'green'},
  {id:'#SUP-0417', title:'Need help with integration', requester:'Sophia Lee', company:'BrightPath', category:'Integration', priority:'Medium', status:'In Progress', date:'Apr 23, 2025', tone:'orange'},
  {id:'#SUP-0416', title:'App is running slow', requester:'Ahmed Raza', company:'Matrix Inc', category:'Performance', priority:'High', status:'Open', date:'Apr 21, 2025', tone:'red'},
  {id:'#SUP-0415', title:'User invitation issue', requester:'Emily Carter', company:'PeopleFirst', category:'Account', priority:'Low', status:'Resolved', date:'Apr 20, 2025', tone:'green'},
  {id:'#SUP-0414', title:'Request for training', requester:'James Wilson', company:'SecureNet', category:'Training', priority:'Medium', status:'Closed', date:'Apr 19, 2025', tone:'orange'},
];

export const users = [
  {name:'John Carter', email:'john.carter@techmigos.com', role:'Admin', company:'TechMigos', status:'Active', last:'2 hrs ago'},
  {name:'Sarah Mitchell', email:'sarah.mitchell@acme.com', role:'Project Manager', company:'Acme Corp', status:'Active', last:'1 day ago'},
  {name:'Michael Tan', email:'michael.tan@novatech.com', role:'Developer', company:'NovaTech', status:'Active', last:'3 hrs ago'},
  {name:'Emily Rodriguez', email:'emily@zenith.com', role:'Designer', company:'Zenith Ltd', status:'Active', last:'5 min ago'},
  {name:'David Kim', email:'david@skyline.com', role:'Client', company:'Skyline', status:'Inactive', last:'14 days ago'},
  {name:'Lisa Wang', email:'lisa@brightpath.com', role:'Support', company:'BrightPath', status:'Active', last:'30 min ago'},
  {name:'Robert Allen', email:'robert@matrix.com', role:'Support', company:'Matrix Inc', status:'Active', last:'8 hrs ago'},
  {name:'Nicole Brooks', email:'nicole@peoplefirst.com', role:'HR', company:'PeopleFirst', status:'Active', last:'2 days ago'},
];

export const files = [
  {name:'homepage-design.png', type:'PNG', size:'2.4 MB', visual:'preview'},
  {name:'project-brief.pdf', type:'PDF', size:'1.1 MB', visual:'pdf'},
  {name:'ui-kit.fig', type:'FIG', size:'8.3 MB', visual:'fig'},
  {name:'team-meeting.jpg', type:'JPG', size:'1.8 MB', visual:'photo'},
  {name:'client-requirements.docx', type:'DOCX', size:'320 KB', visual:'doc'},
  {name:'demo-video.mp4', type:'MP4', size:'12.4 MB', visual:'video'},
  {name:'brand-guidelines.png', type:'PNG', size:'1.6 MB', visual:'brand'},
  {name:'source-files.zip', type:'ZIP', size:'25.1 MB', visual:'zip'},
];

export const nav = [
  {href:'/', label:'Dashboard', icon:'dashboard', group:'Work'},
  {href:'/company/projects', label:'Projects', icon:'folder', group:'Work'},
  {href:'/company/files', label:'Files', icon:'report', group:'Work'},
  {href:'/company/support', label:'Support', icon:'support', group:'Work'},
  {href:'/company/finance', label:'Finance', icon:'finance', group:'Insights'},
  {href:'/company/analytics', label:'Analytics', icon:'chart', group:'Insights'},
  {href:'/company/reports', label:'Reports', icon:'report', group:'Insights'},
  {href:'/company/users', label:'User Management', icon:'users', group:'Admin'},
  {href:'/company/settings', label:'Settings', icon:'settings', group:'Admin'}
];
