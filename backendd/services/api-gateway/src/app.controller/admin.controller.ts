import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';


import { firstValueFrom } from 'rxjs';

@Controller('admins')
export class AdminController {
  constructor(
    @Inject('ADMIN_SERVICE') private readonly adminClient: ClientProxy,
    
  ) {}

  @Post('login')
  async login(@Body() loginDto: { idToken: string }) {
    const response = await this.adminClient.send('auth_login', loginDto).toPromise();
  
    if (response.statusCode !== 200) {
      throw new UnauthorizedException(response.error);
    }
    
    return response.data; 
  }  
    
  @Get()
  async findAll(@Headers('Authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      const result = await firstValueFrom(
        this.adminClient.send('admin_find_all', { idToken: token }),
      );
      return result;
    } catch (error) {
      throw new UnauthorizedException('Token invalide ou erreur lors de la récupération des admins');
    }
  }
}