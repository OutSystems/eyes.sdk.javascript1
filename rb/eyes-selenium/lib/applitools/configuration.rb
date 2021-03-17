require('ostruct')

module Applitools
  module Configuration
    extend self

    def configuration
      @config ||= OpenStruct.new
      @config = @config.to_h.empty? ? @config : OpenStruct.new(transform_config_keys(@config.to_h))
      @config
    end

    def configure
      yield(configuration)
    end

    private

      def transform_config_keys(config)
        config.map do |k,v|
          v = v.to_socket_output if v.respond_to?(:to_socket_output)
          if k.to_s.include?('_')
            key = k.to_s.split('_').map(&:capitalize).join 
            key[0] = key[0].downcase
            [key.to_sym, v]
          else
            [k, v]
          end
        end.to_h
      end
  end # Configuration
end # Applitools
