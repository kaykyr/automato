import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { HandicapCompetition } from './handicap-competition.entity';
import { HandicapOption } from './handicap-option.entity';

@Entity('handicap_games')
export class HandicapGame {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  gameId: string;

  @Column({ length: 100 })
  homeTeam: string;

  @Column({ length: 100 })
  awayTeam: string;

  @Column({ type: 'text' })
  gameUrl: string;

  @Column({ default: false })
  isLive: boolean;

  @Column({ type: 'datetime', nullable: true })
  gameDate: Date;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => HandicapCompetition, competition => competition.games)
  @JoinColumn({ name: 'competitionId' })
  competition: HandicapCompetition;

  @Column({ name: 'competitionId' })
  competitionId: string;

  @OneToMany(() => HandicapOption, option => option.game, { cascade: true })
  handicaps: HandicapOption[];
}