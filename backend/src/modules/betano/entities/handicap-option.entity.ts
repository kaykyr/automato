import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { HandicapGame } from './handicap-game.entity';

@Entity('handicap_options')
export class HandicapOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  team: string;

  @Column({ length: 20 })
  handicap: string; // ex: "-0.5", "+0.25", "0.0"

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  odd: number;

  @Column({ length: 50, nullable: true })
  selectionId: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => HandicapGame, game => game.handicaps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: HandicapGame;

  @Column({ name: 'gameId' })
  gameId: string;
}