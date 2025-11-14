export class UpdateUserDTO {
  constructor(
    public readonly name?: string,
    public readonly img?: string,
  ) {
    if (name !== undefined && typeof name !== 'string')
      throw new Error('Invalid name');
  }
}
