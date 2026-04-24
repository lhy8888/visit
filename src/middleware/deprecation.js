const applyDeprecationHeaders = (options = {}) => {
  const message = options.message || 'This endpoint is deprecated.';
  const replacement = options.replacement || null;

  return (req, res, next) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('X-Deprecated-Endpoint', 'true');
    res.setHeader('X-Deprecated-Message', message);

    if (replacement) {
      res.setHeader('Link', `<${replacement}>; rel="alternate"`);
    }

    next();
  };
};

module.exports = {
  applyDeprecationHeaders
};
