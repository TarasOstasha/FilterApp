module.exports.errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
      return
    }
    
    // Improved error logging
    console.error('------ API Error ------');
    console.error(`Status: ${err.status || 500}`);
    console.error(`Message: ${err.message || 'Server Error'}`);
    console.error(`Path: ${req.originalUrl}`);
    console.error(`Method: ${req.method}`);
    
    if (err.stack) {
      console.error('Stack trace:');
      console.error(err.stack);
    }
    
    if (err.errors) {
      console.error('Validation errors:', err.errors);
    }
    
    console.error('------------------------');
    
    const status = err.status ?? 500
    const message = err.message ?? 'Server Error'
    
    res.status(status).json({
      error: message,
      status: status
    });
  }
