import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig: any = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hr_system',
  user: process.env.DB_USER || 'postgres',
};

// Only add password if it's provided
if (process.env.DB_PASSWORD) {
  dbConfig.password = process.env.DB_PASSWORD;
}

const pool = new Pool(dbConfig);

async function seed() {
  console.log('🌱 Starting database seeding...\n');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📋 Seeding sample data...');
    
    // 1. Create sample organization
    console.log('   - Creating organization...');
    const orgResult = await client.query(`
      INSERT INTO organizations (
        organization_name,
        organization_code,
        subscription_plan,
        subscription_status,
        primary_contact_email,
        timezone,
        currency
      ) VALUES (
        'Demo Company Ltd',
        'DEMO',
        'professional',
        'active',
        'admin@democompany.com',
        'UTC',
        'USD'
      )
      ON CONFLICT (organization_code) DO UPDATE
      SET organization_name = EXCLUDED.organization_name
      RETURNING organization_id
    `);
    
    const organizationId = orgResult.rows[0].organization_id;
    console.log(`   ✓ Organization created: ${organizationId}`);
    
    // 2. Create sample company
    console.log('   - Creating company...');
    const companyResult = await client.query(`
      INSERT INTO companies (
        organization_id,
        company_name,
        company_code,
        legal_name,
        email,
        phone,
        is_active
      ) VALUES (
        $1,
        'Demo Company',
        'DEMO',
        'Demo Company Limited',
        'info@democompany.com',
        '+1234567890',
        TRUE
      )
      ON CONFLICT (organization_id, company_code) DO UPDATE
      SET company_name = EXCLUDED.company_name
      RETURNING company_id
    `, [organizationId]);
    
    const companyId = companyResult.rows[0].company_id;
    console.log(`   ✓ Company created: ${companyId}`);
    
    // 3. Create admin role
    console.log('   - Creating roles...');
    const roleResult = await client.query(`
      INSERT INTO roles (
        organization_id,
        role_name,
        role_code,
        description,
        is_system_role,
        is_active
      ) VALUES (
        $1,
        'System Administrator',
        'ADMIN',
        'Full system access and administrative privileges',
        TRUE,
        TRUE
      )
      ON CONFLICT (organization_id, role_code) DO UPDATE
      SET role_name = EXCLUDED.role_name
      RETURNING role_id
    `, [organizationId]);
    
    const roleId = roleResult.rows[0].role_id;
    console.log(`   ✓ Admin role created: ${roleId}`);
    
    // 4. Create admin user
    console.log('   - Creating admin user...');
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    
    const userResult = await client.query(`
      INSERT INTO users (
        organization_id,
        username,
        email,
        password_hash,
        first_name,
        last_name,
        is_active,
        is_email_verified
      ) VALUES (
        $1,
        'admin',
        'admin@democompany.com',
        $2,
        'Admin',
        'User',
        TRUE,
        TRUE
      )
      ON CONFLICT (organization_id, username) DO UPDATE
      SET email = EXCLUDED.email
      RETURNING user_id
    `, [organizationId, hashedPassword]);
    
    const userId = userResult.rows[0].user_id;
    console.log(`   ✓ Admin user created: ${userId}`);
    
    // 5. Assign admin role to user
    console.log('   - Assigning role to user...');
    await client.query(`
      INSERT INTO user_roles (
        user_id,
        role_id,
        created_by
      ) VALUES (
        $1,
        $2,
        $1
      )
      ON CONFLICT (user_id, role_id) DO NOTHING
    `, [userId, roleId]);
    
    console.log('   ✓ Role assigned');
    
    // 6. Create sample departments
    console.log('   - Creating departments...');
    const departments = [
      { name: 'Engineering', code: 'ENG', description: 'Engineering and Development' },
      { name: 'Human Resources', code: 'HR', description: 'Human Resources Management' },
      { name: 'Finance', code: 'FIN', description: 'Finance and Accounting' },
      { name: 'Sales', code: 'SALES', description: 'Sales and Business Development' }
    ];
    
    for (const dept of departments) {
      await client.query(`
        INSERT INTO departments (
          organization_id,
          company_id,
          department_name,
          department_code,
          description,
          is_active
        ) VALUES (
          $1, $2, $3, $4, $5, TRUE
        )
        ON CONFLICT (organization_id, department_code) DO NOTHING
      `, [organizationId, companyId, dept.name, dept.code, dept.description]);
    }
    
    console.log(`   ✓ ${departments.length} departments created`);
    
    // 7. Create sample leave types
    console.log('   - Creating leave types...');
    const leaveTypes = [
      { name: 'Annual Leave', code: 'ANNUAL', days: 21 },
      { name: 'Sick Leave', code: 'SICK', days: 10 },
      { name: 'Casual Leave', code: 'CASUAL', days: 7 },
      { name: 'Maternity Leave', code: 'MATERNITY', days: 90 },
      { name: 'Paternity Leave', code: 'PATERNITY', days: 14 }
    ];
    
    for (const leave of leaveTypes) {
      await client.query(`
        INSERT INTO leave_types (
          organization_id,
          leave_type_name,
          leave_type_code,
          max_days_per_year,
          is_active
        ) VALUES (
          $1, $2, $3, $4, TRUE
        )
        ON CONFLICT (organization_id, leave_type_code) DO NOTHING
      `, [organizationId, leave.name, leave.code, leave.days]);
    }
    
    console.log(`   ✓ ${leaveTypes.length} leave types created`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📝 Sample credentials:');
    console.log('   Email: admin@democompany.com');
    console.log('   Password: Admin@123\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding
seed();
