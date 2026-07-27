import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUrl, isURL } from 'class-validator';

export const MAX_URLS_PER_JOB = 1000;

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

export class CreateJobDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'urls must contain at least one URL' })
  @ArrayMaxSize(MAX_URLS_PER_JOB, { message: `urls must contain at most ${MAX_URLS_PER_JOB} items` })
  @IsUrl(URL_OPTIONS, {
    each: true,
    // The callback receives the whole array, so the offending entries are
    // singled out here with the same predicate the decorator itself applies.
    message: ({ value }) =>
      `not valid http(s) URLs: ${(value as string[])
        .filter((url) => typeof url !== 'string' || !isURL(url, URL_OPTIONS))
        .join(', ')}`,
  })
  urls!: string[];
}
