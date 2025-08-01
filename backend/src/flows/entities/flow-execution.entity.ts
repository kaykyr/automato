import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Flow } from './flow.entity';

@Entity('flow_executions')
export class FlowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Flow, flow => flow.executions, { onDelete: 'CASCADE' })
  flow: Flow;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending'
  })
  status: string;

  @Column({ nullable: true })
  currentNode: string;

  @Column('json', { default: '{}' })
  results: any;

  @Column('text', { nullable: true })
  error: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column('json', { default: '{}' })
  variables: any;

  @Column('json', { default: '[]' })
  executionLog: any[];
}