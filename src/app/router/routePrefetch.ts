type RouteModuleLoader = () => Promise<unknown>;

export function createRoutePrefetcher(loaders: Readonly<Partial<Record<string, RouteModuleLoader>>>) {
  const requests = new Map<string, Promise<void>>();

  return (path: string) => {
    const routePath = path.split(/[?#]/, 1)[0];
    const load = loaders[routePath];

    if (!load) {
      return Promise.resolve();
    }

    const existingRequest = requests.get(routePath);
    if (existingRequest) {
      return existingRequest;
    }

    const request = load()
      .then(() => undefined)
      .catch(() => {
        if (requests.get(routePath) === request) {
          requests.delete(routePath);
        }
      });

    requests.set(routePath, request);
    return request;
  };
}
