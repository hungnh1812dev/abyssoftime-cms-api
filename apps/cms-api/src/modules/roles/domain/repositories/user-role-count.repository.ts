export interface IUserRoleCountRepository {
  countByRoleId(roleId: string): Promise<number>;
}

export const USER_ROLE_COUNT_REPOSITORY = Symbol("USER_ROLE_COUNT_REPOSITORY");
