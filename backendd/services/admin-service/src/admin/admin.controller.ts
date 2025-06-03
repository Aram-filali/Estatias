import { Controller, UnauthorizedException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AdminService } from './admin.service';
import * as admin from 'firebase-admin';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @MessagePattern('auth_login')
  async loginAdmin(data: { idToken?: string }) {
    try {

      const { idToken = ''} = data;
      const response = await this.adminService.loginAdmin(idToken);
      return { statusCode: 200, data: response };

    } catch (err) {
      return { statusCode: err.status || 401, data: null, error: err.message };
    }
  }  

  @MessagePattern('admin_find_all')
  async findAll(@Payload() data: { idToken: string }) {
    try {

      const decodedToken = await admin.auth().verifyIdToken(data.idToken);
      return this.adminService.findAll();

    } catch (error) {
      throw new UnauthorizedException('Token invalide');
    }
  }
}