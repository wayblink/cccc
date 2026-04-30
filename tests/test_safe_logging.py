import contextlib
import io
import logging
import unittest


class TestSafeLogging(unittest.TestCase):
    def _isolated_logger(self) -> tuple[logging.Logger, list[logging.Handler], int, bool]:
        logger = logging.getLogger("cccc.tests.safe_logging")
        old_handlers = list(logger.handlers)
        old_level = logger.level
        old_propagate = logger.propagate
        logger.handlers = []
        logger.setLevel(logging.INFO)
        logger.propagate = False
        return logger, old_handlers, old_level, old_propagate

    def test_safe_logger_call_skips_closed_stream_handlers_without_stderr_noise(self) -> None:
        from cccc.util.safe_logging import safe_logger_call

        logger, old_handlers, old_level, old_propagate = self._isolated_logger()
        old_raise_exceptions = logging.raiseExceptions
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        logger.addHandler(handler)
        stream.close()
        logging.raiseExceptions = True
        stderr = io.StringIO()
        try:
            with contextlib.redirect_stderr(stderr):
                safe_logger_call(logger, "info", "hello %s", "world")
            self.assertEqual(stderr.getvalue(), "")
            self.assertIs(logging.raiseExceptions, True)
        finally:
            logger.handlers = old_handlers
            logger.setLevel(old_level)
            logger.propagate = old_propagate
            logging.raiseExceptions = old_raise_exceptions

    def test_safe_logger_call_preserves_normal_logging(self) -> None:
        from cccc.util.safe_logging import safe_logger_call

        logger, old_handlers, old_level, old_propagate = self._isolated_logger()
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        logger.addHandler(handler)
        try:
            safe_logger_call(logger, "info", "hello %s", "world")
            self.assertIn("hello world", stream.getvalue())
        finally:
            logger.handlers = old_handlers
            logger.setLevel(old_level)
            logger.propagate = old_propagate


if __name__ == "__main__":
    unittest.main()
