from __future__ import annotations

import logging
from typing import Any, Optional


def is_closed_stream_logging_error(exc: BaseException) -> bool:
    if not isinstance(exc, ValueError):
        return False
    message = str(exc or "").strip().lower()
    return "i/o operation on closed file" in message or "closed stream" in message


def _has_closed_stream_handler(logger: logging.Logger) -> bool:
    current: Optional[logging.Logger] = logger
    while current is not None:
        for handler in current.handlers:
            stream = getattr(handler, "stream", None)
            if bool(getattr(stream, "closed", False)):
                return True
        if not current.propagate:
            break
        current = current.parent
    return False


def safe_logger_call(logger: logging.Logger, method: str, message: str, *args: Any, **kwargs: Any) -> None:
    log_method = getattr(logger, method, None)
    if not callable(log_method):
        return
    if _has_closed_stream_handler(logger):
        return

    previous_raise_exceptions = logging.raiseExceptions
    logging.raiseExceptions = False
    try:
        log_method(message, *args, **kwargs)
    except Exception as exc:
        if is_closed_stream_logging_error(exc):
            return
        raise
    finally:
        logging.raiseExceptions = previous_raise_exceptions
