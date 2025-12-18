export default {
  apiPrefix: '/api/v1',
  swagger: {
    path: '/api/docs',
    spec: 'openapi.json',
  },
  auth: {
    path: '/auth',
    login: '/login',
    logout: '/logout',
    changePassword: '/password',
    register: '/register',
    verify: '/verify',
  },
  userProfile: {
    path: '/user-profile',
  },
  ride: {
    path: '/ride',
  },
  driver: {
    path: '/driver',
  },
  item: {
    path: '/item',
  },
  order: {
    path: '/order',
  },
  rideHistory: {
    path: '/ride-history',
  },
  adminVerification: {
    path: '/admin-verification',
  },
  advertisment: {
    path: '/advertisment',
  },
  redeemPointsHistory: {
    path: '/redeem-points-history',
  },
  subscription: {
    path: '/subscription',
  },
  usersAll:{
    path: '/users',
  },
  
};