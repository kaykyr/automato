import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('handicap_cache')
export class HandicapCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200, unique: true })
  cacheKey: string; // ex: "handicap:brasileirao-serie-c:18249"

  @Column({ type: 'longtext' })
  data: string; // JSON stringificado dos dados

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Método helper para verificar se o cache expirou
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Método helper para calcular tempo restante em minutos
  getTimeToExpiry(): number {
    const now = new Date().getTime();
    const expiry = this.expiresAt.getTime();
    return Math.max(0, Math.floor((expiry - now) / (1000 * 60)));
  }
}