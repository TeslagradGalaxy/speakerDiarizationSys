export default [
  {
    path: '/user',
    layout: false,
    routes: [{ name: '登录', path: '/user/login', component: './User/Login' }],
  },
  { path: '/home',name:'主页', icon: 'HomeTwoTone', component: './Dashboard' },
  { path: '/', redirect: '/home' },
  {
    path: '/meeting-summary/:meeting_id',
    name: '会议纪要',
    icon: 'FileTextTwoTone',
    component: './MeetingSummary',
  },
  { path: '*', layout: false, component: './404' },
];
