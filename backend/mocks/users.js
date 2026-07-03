// Mock users for MOCK_DATA=true. Passwords are hashed at load so the mock and
// real paths verify credentials identically. Demo credentials (shown on the
// login screen): admin / admin123 and staff / staff123.
//
// `provider` is 'local' (username/password) or 'google' (OAuth). Google users
// have no passwordHash. Users can log in with their username OR email.
import bcrypt from 'bcryptjs';

export const users = [
  {
    id: 'user-admin',
    username: 'admin',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    provider: 'local',
    passwordHash: bcrypt.hashSync('admin123', 8),
  },
  {
    id: 'user-staff',
    username: 'staff',
    email: 'staff@example.com',
    name: 'Staff User',
    role: 'staff',
    provider: 'local',
    passwordHash: bcrypt.hashSync('staff123', 8),
  },
];

export default users;
