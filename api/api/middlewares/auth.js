import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../../models/user.js';

dotenv.config();
// export const authenticateWithToken = (req, res, next) => {
//   const authHeader = req.get('Authorization');
//   if (authHeader) {
//     const m = authHeader.match(/^(Token|Bearer) (.+)/i);
//     if (m) {
//       UserService.authenticateWithToken(m[2])
//         .then((user) => {
//           req.user = user;
//           next();
//         })
//         .catch((err) => {
//           next(err);
//         });
//       return;
//     }
//   }

//   next();
// };
export const authenticateWithToken = async (req, res, next) => {
    const openPaths = ['/api/v1/auth/register', '/api/v1/auth/login','/api/v1/auth/login'];
    if (openPaths.includes(req.path)) return next();
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Hello you not auth' });
    }
  
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Verify JWT token
        const user = await User.findById(decoded.id);  // Fetch user from DB using userId from token payload
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized: User not found' });
        }
    
        req.user = user;  // Attach user info to request object
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

export const requireUser = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: 'You don\'t have access to this resource' });
    return;
  }

  next();
};