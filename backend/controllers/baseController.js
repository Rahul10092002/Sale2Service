/**
 * Base Controller providing standardized API response formatting
 */
export class BaseController {
  sendSuccess(res, data = {}, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  sendCreated(res, data = {}, message = "Created successfully") {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  sendPaginated(res, { items, page = 1, limit = 10, total = 0 }, message = "Success") {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      message,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
        },
      },
    });
  }

  sendError(res, message = "Internal server error", statusCode = 500, errorCode = "SERVER_ERROR") {
    return res.status(statusCode).json({
      success: false,
      message,
      error_code: errorCode,
    });
  }
}
