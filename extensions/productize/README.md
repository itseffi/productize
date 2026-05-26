# Productize Extension

This extension ships the Productize skill catalog as Productize setup assets.

It does not replace Productize's bundled `cy-*` workflow skills. It adds the
Productize layer on top of Productize so the same engine can install and use both
sets of skills.

## Install

From a Productize checkout:

```sh
productize ext install --yes ./extensions/productize
productize ext enable productize
productize setup --all
```

After setup, agents get the Productize workflow skills and the namespaced
Productize skills such as `/productize`, `/productize-0-1`,
`/productize-product-review`, `/productize-design-review`,
`/productize-eng-review`, `/productize-qa`, and `/productize-release`.
