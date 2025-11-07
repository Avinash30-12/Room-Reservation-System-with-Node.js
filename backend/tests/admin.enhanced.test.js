const User = require('../models/user');
require('./test-utils/test-setup');

describe('Admin Script (enhanced) using test harness', () => {
  // test-setup clears DB between tests, no extra setup required
  beforeEach(async () => {});

  test('should create admin user', async () => {
    const adminData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'adminpass123'
    };

    const admin = await User.create({ ...adminData, role: 'admin' });

    expect(admin).toBeDefined();
    expect(admin.role).toBe('admin');
    expect(admin.email).toBe(adminData.email);
  });

  test('should not create admin with existing email', async () => {
    const adminData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'adminpass123'
    };

    // Pre-create a user with same email
    await User.create({ ...adminData, role: 'user' });

    await expect(User.create({ ...adminData, role: 'admin' })).rejects.toThrow();
  });

  test('should not create admin with invalid email', async () => {
    const adminData = {
      name: 'Admin User',
      email: 'invalid-email',
      password: 'adminpass123'
    };

    await expect(User.create({ ...adminData, role: 'admin' })).rejects.toThrow();
  });

  test('should not create admin with short password', async () => {
    const adminData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: '123'  // Too short
    };

    await expect(User.create({ ...adminData, role: 'admin' })).rejects.toThrow();
  });

  test('should create multiple admin users', async () => {
    const adminData1 = {
      name: 'Admin One',
      email: 'admin1@example.com',
      password: 'adminpass123'
    };

    const adminData2 = {
      name: 'Admin Two',
      email: 'admin2@example.com',
      password: 'adminpass123'
    };

    const admin1 = await User.create({ ...adminData1, role: 'admin' });
    const admin2 = await User.create({ ...adminData2, role: 'admin' });

    expect(admin1.role).toBe('admin');
    expect(admin2.role).toBe('admin');
    
    const admins = await User.find({ role: 'admin' });
    expect(admins).toHaveLength(2);
  });

  test('should hash admin password', async () => {
    const adminData = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'adminpass123'
    };

    const admin = await User.create({ ...adminData, role: 'admin' });
    // Password in returned document should be hashed (not equal to raw)
    expect(admin.password).not.toBe(adminData.password);
  });
});