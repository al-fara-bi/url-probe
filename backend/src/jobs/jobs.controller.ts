import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobDetail, JobSummary } from './job.types';
import { JobsService } from './jobs.service';

@Controller('api/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto): { jobId: string } {
    return this.jobsService.create(dto.urls);
  }

  @Get()
  list(): JobSummary[] {
    return this.jobsService.list();
  }

  @Get(':id')
  detail(@Param('id') id: string): JobDetail {
    return this.jobsService.getDetail(id);
  }

  @Delete(':id')
  cancel(@Param('id') id: string): JobDetail {
    return this.jobsService.cancel(id);
  }
}
