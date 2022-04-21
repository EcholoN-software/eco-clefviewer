export interface LogMessage {
  t: Date;
  m: string;
  mt: string;
  l: string;
  x: any;
  i: string;
  r: string[];
  params: { [key: string]: any };
}

export function createLogMessage(logMessageObj: any): LogMessage {
  const logMessage: LogMessage = {
    t: logMessageObj['@t'] ? new Date(logMessageObj['@t']) : new Date(Date.now()),
    m: logMessageObj['@m'],
    mt: logMessageObj['@mt'],
    l: logMessageObj['@l'] || 'Informational',
    x: logMessageObj['@x'],
    i: logMessageObj['@i'],
    r: logMessageObj['@r'],
    params: []
  };

  delete logMessageObj['@t'];
  delete logMessageObj['@m'];
  delete logMessageObj['@mt'];
  delete logMessageObj['@l'];
  delete logMessageObj['@x'];
  delete logMessageObj['@i'];
  delete logMessageObj['@r'];

  logMessage.params = logMessageObj;

  if (logMessage.x) {
    logMessage.params['Exception'] = logMessage.x;
  }

  if (logMessage.m == null && logMessage.mt != null) {
    let message = logMessage.mt;
    const found = logMessage.mt.match(/{[^}]*}/g);
    if (found && found.length > 0) {
      found.forEach(foundString => {
        const paramName = foundString.replace(/[{}]/g, '');
        const value = logMessage.params[paramName];
        if (value != null) {
          message = message.replace(foundString, value);
        } else if (paramName.includes('@')) {
          message = message.replace(foundString, paramName);
        }
      });
    }
    logMessage.m = message;
  }

  const lineBreakAt = logMessage.m.search(/(?:\r\n|\r|\n)/);

  if (lineBreakAt != null && lineBreakAt !== -1) {
    const message = logMessage.m;
    logMessage.m = message.substring(0, lineBreakAt) + ' (for following lines see @LogMessage)';
    logMessage.params['@LogMessage'] = message.substring(lineBreakAt);
  }

  return logMessage;
}