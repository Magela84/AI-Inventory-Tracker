// Mock users for MOCK_DATA=true. Passwords are hashed at load so the mock and
// real paths verify credentials identically. Demo credentials (shown on the
// login screen): admin / admin123 and staff / staff123.
import bcrypt from 'bcryptjs';

export const users = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Admin User',
    role: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 8),
  },
  {
    id: 'user-staff',
    username: 'staff',
    name: 'Staff User',
    role: 'staff',
    passwordHash: bcrypt.hashSync('staff123', 8),
  },
];

export default users;
