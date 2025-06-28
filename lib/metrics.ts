import { StatsD } from 'hot-shots';

const metrics = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: parseInt(process.env.STATSD_PORT || '8125'),
  prefix: 'lumen_adtech.',
  globalTags: {
    environment: process.env.NODE_ENV || 'development'
  }
});

export { metrics }; 