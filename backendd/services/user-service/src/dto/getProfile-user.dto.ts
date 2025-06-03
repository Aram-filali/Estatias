export class ProfileDto {
    firebaseUid: string;
    fullname?: string;
    email?: string;
    role?: string;
  }
  
  export class GetProfileDto {
    idToken: string;
  }