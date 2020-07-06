#!/usr/bin/env bash

bucket_name='maprover.io'

index_file='index-mr.html'
error_file='error.html'

AWS_CMD='aws'


# which directories we don't need for the frontend site itself
# they will not get copied/synced to S3
# gave up doing this in bash >:( and just hard-coded the dirs
# cmd_arr=(s3 sync "../" "s3://${bucket_name}")
# exclude_dirs=(.git deploy test)
# for dir in "${exclude_dirs[@]}";
#   do cmd_arr+=(--exclude "\"./${dir}/*\"");
# done
# for i in "${cmd_arr[@]}"; do echo "$i"; done

# first check if bucket already exists; if not, need to create it
if ${AWS_CMD} s3api head-bucket --bucket ${bucket_name} 2>/dev/null; then
    # if it already exists, use sync rather than copying everything:
    echo "Syncing files to existing bucket ${bucket_name}"
    ${AWS_CMD} s3 sync ../ "s3://${bucket_name}" \
        --exclude ".git/*" --exclude "deploy/*" \
        --exclude "test/*" --exclude ".devcontainer/*" \
        --exclude ".vscode/*" --exclude ".gitignore" \
        --exclude "README.md"

    # ${AWS_CMD} "${cmd_arr[@]}"
else
    echo "Creating bucket ${bucket_name}..."
    ${AWS_CMD} s3api create-bucket --bucket ${bucket_name} --acl public-read --region us-east-1
    ${AWS_CMD} s3 cp ../ "s3://${bucket_name}" --recursive --exclude ".git/*" --exclude "deploy/*" --exclude "test/*"
fi

# if this hasn't changed, the next two commands need not be be re-run,
# but its also harmless to do so
${AWS_CMD} s3 website "s3://${bucket_name}" \
    --index-document ${index_file} \
    --error-document ${error_file}

# ${AWS_CMD} s3api put-bucket-policy --bucket ${bucket_name} --policy file://public_policy.json

# BONUS: removing all items with a given prefix when we screw up sync and copy too much!
# aws s3 rm s3://maprover-demo --dryrun --recursive --exclude "*" --include "deploy/*"

# need to coordinate the bucket name with the policy JSON:
# should probably convert into something more "AWS" like a CloudFormation?
sed_str="s/\(arn:aws:s3:::\)BUCKETNAME\//\1${bucket_name}\//"
bucket_policy=$(sed -e "${sed_str}" < public_policy.json)
${AWS_CMD} s3api put-bucket-policy --bucket ${bucket_name} --policy "${bucket_policy}"
