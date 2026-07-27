import { Module } from '@nestjs/common';
import { UrlCheckerService } from '../url-check/url-checker.service';
import { JobRunnerService } from './job-runner.service';
import { JobsController } from './jobs.controller';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsRepository, JobRunnerService, UrlCheckerService],
})
export class JobsModule {}
