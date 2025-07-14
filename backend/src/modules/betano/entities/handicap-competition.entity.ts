import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { HandicapGame } from './handicap-game.entity';

@Entity('handicap_competitions')
export class HandicapCompetition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  competitionId: string;

  @Column({ type: 'text', nullable: true })
  url: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => HandicapGame, game => game.competition)
  games: HandicapGame[];
}