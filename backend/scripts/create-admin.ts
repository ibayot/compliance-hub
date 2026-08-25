import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module'; // The path depends on where this is run
import * as bcrypt from 'bcrypt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get(getRepositoryToken(User));
  
  const hash = await bcrypt.hash('Changeme123!@#', 10);
  
  await userRepo.save({
    email: 'testadmin@dswd.gov.ph',
    passwordHash: hash,
    firstName: 'Test',
    lastName: 'Admin',
    role: 'super_admin',
    active: true,
  });
  
  console.log('Admin created: testadmin@dswd.gov.ph / Changeme123!@#');
  await app.close();
}
bootstrap();
