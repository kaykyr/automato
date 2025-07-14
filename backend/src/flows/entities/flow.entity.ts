import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { FlowExecution } from './flow-execution.entity';

@Entity('flows')
export class Flow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('json')
  nodes: any;

  @Column('json')
  edges: any;

  @Column('json', { default: '{}' })
  variables: any;

  @Column('json', { nullable: true })
  browserSettings: any;

  @Column('json', { nullable: true })
  apiConfig: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => FlowExecution, execution => execution.flow, { cascade: true })
  executions: FlowExecution[];
}