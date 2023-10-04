# Delete Webflow CMS Items

This code sample will delete every CMS item in the specified collections.

## Why

Webflow CMS items can be a challenge to delete in the Webflow UI if you make use of reference fields. You will often get errors indicating that records are still referenced by other records. This tool goes through **all** of the records in the provided Webflow collections, clears all reference fields one-by-one, and finally deletes the records.

## Usage

### Installation

Clone this repository, then run:

```
yarn install
```

You may need to also run:

```
nvm use
```

Finally, run:

```
yarn run build
```

### Commands

First, get an API key for your Webflow site.

1. Go to your [Webflow Dashboard](https://webflow.com/dashboard).
1. Click the three dots on a Webflow site.
1. Click "Settings".
1. Click "Apps & Integrations".
1. Click "Generate Legacy API Token". (Important: make sure to pick the **legacy** API token)
1. Copy the API token and store it somewhere safe for later.

#### Get Webflow site IDs

Next, you'll first need to get the Webflow site IDs where you want to delete records. This isn't visible in the Webflow UI, so run this command:

```
yarn run webflow-utils list-sites --apiKey <your_api_key>
```

This will print the site names and IDs.

#### Delete all records in specific collections

**Warning: this will delete all records in the specified collections! Make sure you want to do this before running. Use at your own risk.**

```
yarn run webflow-utils empty-webflow --apiKey <your_api_key> --siteIds <all|siteIds...> --collectionIds <all|collectionIds...>
```

If you want to specify multiple site IDs or collection IDs, they should be space-separated.
