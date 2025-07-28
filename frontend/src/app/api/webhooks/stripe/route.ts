import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    const body = await request.text();

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // In production, verify the webhook signature with Stripe
    console.log('Stripe webhook received:', { signature, bodyLength: body.length });

    // Mock webhook processing
    return NextResponse.json({
      received: true,
      processed_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'stripe-webhook',
    status: 'operational',
    methods: ['POST']
  });
}