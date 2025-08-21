# Production Deployment Checklist

This checklist ensures a smooth deployment of the Razorpay integration to the production environment.

## Pre-Deployment

### Code Review
- [ ] All code changes have been peer-reviewed
- [ ] All tests are passing
- [ ] Code has been merged to the main branch
- [ ] Version number has been updated

### Configuration
- [ ] Environment variables are set in production
- [ ] Database migrations are prepared
- [ ] Feature flags are configured
- [ ] Rate limiting is properly configured

### Infrastructure
- [ ] Server resources are scaled appropriately
- [ ] Database backups are scheduled
- [ ] Monitoring and alerting are set up
- [ ] CDN is configured (if applicable)

## Deployment

### Database
- [ ] Backup production database
- [ ] Run database migrations
- [ ] Verify data consistency

### Application
- [ ] Deploy backend services
- [ ] Deploy frontend assets
- [ ] Verify all services are running
- [ ] Clear any caches

### Third-Party Services
- [ ] Update Razorpay webhook URLs
- [ ] Verify API keys and secrets
- [ ] Test webhook delivery

## Post-Deployment

### Verification
- [ ] Smoke test critical paths
- [ ] Verify subscription flow
- [ ] Check error logs
- [ ] Monitor performance metrics

### Monitoring
- [ ] Set up dashboards
- [ ] Configure alerts
- [ ] Monitor error rates
- [ ] Track subscription metrics

## Rollback Plan

### Conditions for Rollback
- [ ] Critical errors in production
- [ ] Performance degradation
- [ ] Data corruption

### Rollback Steps
1. Revert to previous version
2. Rollback database migrations
3. Clear caches
4. Verify system stability

## Communication Plan

### Internal Team
- [ ] Notify team of deployment schedule
- [ ] Assign on-call personnel
- [ ] Document known issues

### Customers
- [ ] Prepare release notes
- [ ] Schedule maintenance window
- [ ] Prepare status updates

## Sign-Off

- [ ] Development Lead
- [ ] QA Lead
- [ ] Product Owner
- [ ] DevOps
