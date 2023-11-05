import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'pm_themes' })
export class ThemeEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  theme!: string;
}

@Entity({ name: 'pm_promise_themes' })
export class PromiseThemeEntity {
  @Column({ name: 'promise_id', primary: true })
  promiseId!: number;

  @Column({ name: 'theme_id', primary: true })
  themeId!: number;
}
