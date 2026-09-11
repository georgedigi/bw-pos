export default function handler(req: any, res: any) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.status(200).json({ ip: ip || null });
  }
  