# Salesforce FUSE

This project allows mounting Salesforce Orgs to the local machine, to make browsing Metadata, and maybe records in the future, easier.

It uses `fuse-native` under the hood to create the filesystem, meaning that it should work on Linux and Mac. However, I have only tested it on Linux.

## Disclaimer

This project is in its proof of concept phase and it is not stable, while also missing a lot of features.

It currently only supports reading Apex classes, and it may fail if the class is larger than 4KB.

## Installation

1. Clone the repo: `git clone https://github.com/jim3692/salesforce-fuse`
2. Install dependencies: `yarn install`
3. Install kernel module: `sudo ./node_modules/.bin/fuse-native configure`

## Usage

1. Set org: `export SFDX_DEFAULTUSERNAME=myusername@salesforce.com`
2. Set mount point: `export MOUNT_POINT=/path/to/mount`
3. Run the project (no root access is required): `npm start`

To unmount on Linux, run: `fusermount -u /path/to/mount`
