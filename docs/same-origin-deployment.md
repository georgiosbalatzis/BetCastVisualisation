# Same-origin production assembly

Main owns the single f1stories.gr Pages deployment. Source stays in this repository. `npm run build:f1stories` builds for `/betcast/`; ordinary build/dev/preview and existing Pages publishing remain available during transition. No deployment is performed by this command. CRA uses its native PUBLIC_URL build variable; the canonical target sets /betcast explicitly. Ordinary builds retain homepage=".".

Canonical navigation is selected at build time with REACT_APP_F1STORIES_BUILD; there is no runtime dependency on Main. Query/share/embed state still uses the current location. No storage bridge, analytics injection or PWA registration is added. Relative manifest start_url/scope/icons resolve beneath this application. Main pins reviewed source commits and records deployment metadata.

Do not retire or redirect the old github.io site until the canonical deployment has passed production checks and cutover is explicitly authorized. These uncommitted changes cannot be represented by a production source SHA yet.
