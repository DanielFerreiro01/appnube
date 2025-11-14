export class CreateUserDTO {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
  ) {
    if (!name) throw new Error('Name is required');
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
  }
}
