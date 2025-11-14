import { UserEntity } from "../../entities/user/user.entity";

export class UserResponseDTO {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly role: string[],
    public readonly img?: string,
    public readonly favorites?: string[],
  ) {}

  static fromEntity(entity: UserEntity) {
    return new UserResponseDTO(
      entity.id,
      entity.name,
      entity.email,
      entity.role,
      entity.img,
      entity.favorites,
    );
  }
}
