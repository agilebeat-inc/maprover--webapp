#!/usr/bin/env bash

bucket_name='maprover-demo'

index_file='index-mr.html'
error_file='error.html'

AWS_CMD='aws2'


# first check if bucket already exists; if not, need to create it
if ${AWS_CMD} s3api head-bucket --bucket ${bucket_name} 2>/dev/null; then
    # if it already exists, use sync rather than copying everything:
    ${AWS_CMD} s3 sync ../ "s3://${bucket_name}" --exclude ".git/*"
else
    echo "Creating bucket ${bucket_name}..."
    ${AWS_CMD} s3api create-bucket --bucket ${bucket_name} --acl public-read --region us-east-1
    ${AWS_CMD} s3 cp ../ "s3://${bucket_name}" --recursive --exclude ".git/*"
fi

# if this hasn't changed, it doesn't need to be re-run
${AWS_CMD} s3 website "s3://${bucket_name}" \
    --index-document ${index_file} \
    --error-document ${error_file}

${AWS_CMD} s3api put-bucket-policy --bucket ${bucket_name} --policy file://public_policy.json