import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FeaturedProduct = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Learn, Earn & Share
        </h2>
        <p className="text-xl text-center text-gray-600 mb-12">
          Make Fun Travel Videos for Friends & Family
        </p>

        <Card className="border-2 border-accent/20 bg-accent/5 overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/4 flex justify-center">
                <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-3xl font-display font-medium text-accent-foreground">Video</span>
                </div>
              </div>

              <div className="w-full md:w-3/4">
                <p className="text-lg mb-6">
                  Turn your travels into beautiful memories and income opportunities.
                  <br />
                  Pam even helps you promote your creations to fellow travellers.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <span className="text-2xl font-bold text-primary">A$47 or free with annual membership</span>
                  <Button
                    className="font-semibold"
                    size="lg"
                    onClick={() => window.open('https://videocourse.wheelsandwins.com', '_blank')}
                  >
                    → View Course
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FeaturedProduct;
